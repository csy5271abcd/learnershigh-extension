import { useState } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import type { UniversityExamCategory, UniversityExamDocument } from '../api/types.ts'
import { getUniversityExamFileStates, listUniversityExamDocuments } from '../api/universityExamApi.ts'
import { ChevronDownIcon, CloseIcon, InfoIcon, SlidersIcon } from '../components/AssessmentIcons.tsx'
import type { CreateEnrichmentPrefill } from '../components/enrichment/CreateEnrichmentModal.tsx'
import { EnrichmentFrame } from '../components/enrichment/EnrichmentFrame.tsx'
import enrichmentStyles from '../components/enrichment/enrichment.module.css'
import { MockDataNotice } from '../components/MockDataNotice.tsx'
import { EmptyState, ErrorState, LoadingRows } from '../components/StateViews.tsx'
import { examTaskPrefill } from '../components/university/examTaskPrefill.ts'
import { UniversityExamRow } from '../components/university/UniversityExamRow.tsx'
import styles from '../components/university/university.module.css'
import { useAssessmentWorkspace } from '../model/assessmentWorkspace.ts'
import { examCategoryLabels, examCategoryOrder, matchesExamSearch } from '../model/universityExamView.ts'
import { useApiQuery } from '../model/useApiQuery.ts'

/** 대학 선택 (학교 공식 로고 없이 이름). 문서 수는 받은 목록에서 센다. */
const universityTabs = [
  { key: 'snu', name: '서울대학교', match: '서울대학교' },
  { key: 'kaist', name: 'KAIST', match: 'KAIST' },
] as const

type UniversityKey = (typeof universityTabs)[number]['key']

const parseUniversity = (value: string | null): UniversityKey | undefined => universityTabs.find((tab) => tab.key === value)?.key

const sortOptions = [
  { value: 'recent', label: '학년도 최신순' },
  { value: 'oldest', label: '학년도 오래된순' },
  { value: 'title', label: '자료명순' },
] as const

type SortKey = (typeof sortOptions)[number]['value']

/** 같은 학년도 안에서는 받은 순서(대학·자료 순)를 유지한다 */
function sortDocuments(documents: UniversityExamDocument[], sort: SortKey): UniversityExamDocument[] {
  const sorted = [...documents]
  if (sort === 'title') sorted.sort((a, b) => a.title.localeCompare(b.title, 'ko'))
  else sorted.sort((a, b) => (sort === 'recent' ? b.academicYear - a.academicYear : a.academicYear - b.academicYear))
  return sorted
}

// 대학별 자료 (screen-map S20, 2026-10-28 목록형으로 간소화, P-25 PROPOSED). SNU·KAIST 실제 기출·예시 PDF를 한 줄씩 보여주고
// 원문은 앱 안 PDF 화면에서 연다. 검색은 위 검색창(문서 목록 검색, PDF 본문 검색 아님), 대학은 칩, 학년도·과목·유형은 "필터"에서 고른다.
// 조건은 URL Query(university, year, subject, type, sort, q)에 둔다.
export function UniversityResourcesRoute() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { selectedContext } = useAssessmentWorkspace()
  const query = searchParams.get('q') ?? ''
  const university = parseUniversity(searchParams.get('university'))
  const yearParam = Number(searchParams.get('year')) || undefined
  const subjectParam = searchParams.get('subject') ?? ''
  const typeParam = (examCategoryOrder as string[]).includes(searchParams.get('type') ?? '') ? (searchParams.get('type') as UniversityExamCategory) : undefined
  const sort: SortKey = sortOptions.find((option) => option.value === searchParams.get('sort'))?.value ?? 'recent'
  const [createRequest, setCreateRequest] = useState<CreateEnrichmentPrefill | null>(null)
  const activeFilterCount = [yearParam, subjectParam, typeParam].filter(Boolean).length
  // 조건이 걸린 채로 들어오면(뒤로 가기 등) 필터를 펼쳐 둔다.
  const [filterOpen, setFilterOpen] = useState(activeFilterCount > 0)

  const documents = useApiQuery('ae-uni-exams', () => listUniversityExamDocuments())
  const fileStates = useApiQuery('ae-uni-exam-files', () => getUniversityExamFileStates())
  const all = documents.data?.items ?? []

  const updateParams = (changes: Record<string, string | undefined>) =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        for (const [name, value] of Object.entries(changes)) {
          if (value) next.set(name, value)
          else next.delete(name)
        }
        return next
      },
      { replace: true, preventScrollReset: true },
    )

  const matchesUniversity = (document: UniversityExamDocument) =>
    !university || document.university === universityTabs.find((tab) => tab.key === university)?.match
  const inUniversity = all.filter(matchesUniversity)
  const years = [...new Set(inUniversity.map((document) => document.academicYear))].sort((a, b) => b - a)
  const subjects = [...new Set(inUniversity.flatMap((document) => document.subjectAreas))]
  const visible = sortDocuments(
    inUniversity.filter(
      (document) =>
        (!yearParam || document.academicYear === yearParam) &&
        (!subjectParam || document.subjectAreas.includes(subjectParam)) &&
        (!typeParam || document.category === typeParam) &&
        matchesExamSearch(document, query),
    ),
    sort,
  )
  const resetFilters = () => updateParams({ year: undefined, subject: undefined, type: undefined })
  const resetAll = () => updateParams({ year: undefined, subject: undefined, type: undefined, q: undefined })
  // 대학을 바꾸면 그 대학에 없는 학년도·과목 조건은 의미가 없어 지운다 (유형·검색어·정렬은 그대로).
  const selectUniversity = (key: UniversityKey | undefined) => updateParams({ university: key, year: undefined, subject: undefined })

  const appliedFilters = [
    yearParam ? { key: 'year', label: `${yearParam}학년도` } : null,
    subjectParam ? { key: 'subject', label: subjectParam } : null,
    typeParam ? { key: 'type', label: examCategoryLabels[typeParam] } : null,
  ].filter((item): item is { key: string; label: string } => item !== null)

  return (
    <EnrichmentFrame
      createRequest={createRequest}
      onCreateRequestHandled={() => setCreateRequest(null)}
      searchPlaceholder="자료 제목, 과목, 핵심 개념으로 찾기"
    >
      <div className={styles.listArea}>
        <header className={styles.intro}>
          <h2 className={styles.introTitle}>대학별 자료</h2>
          <p className={styles.introBody}>대학별 기출·예시 문항을 살펴보고, 관심 있는 주제로 심화 탐구를 시작하세요.</p>
        </header>

        {documents.status === 'error' && documents.error ? (
          <div className={enrichmentStyles.stateArea}>
            <ErrorState title="대학별 자료를 불러오지 못했어요" error={documents.error} onRetry={documents.retry} />
          </div>
        ) : !documents.data ? (
          <div className={enrichmentStyles.stateArea}>
            <LoadingRows rows={4} label="대학별 자료를 불러오는 중" />
          </div>
        ) : all.length === 0 ? (
          <div className={enrichmentStyles.stateArea}>
            <EmptyState title="아직 등록된 대학 자료가 없어요" description="확인된 대학 기출·예시 자료가 등록되면 여기에 보여요." />
          </div>
        ) : (
          <>
            <div className={styles.listToolbar}>
              <div className={styles.chips} role="group" aria-label="대학">
                <button type="button" className={styles.chip} aria-pressed={!university} onClick={() => selectUniversity(undefined)}>
                  전체 <span>{all.length}</span>
                </button>
                {universityTabs.map((tab) => (
                  <button key={tab.key} type="button" className={styles.chip} aria-pressed={university === tab.key} onClick={() => selectUniversity(tab.key)}>
                    {tab.name} <span>{all.filter((document) => document.university === tab.match).length}</span>
                  </button>
                ))}
              </div>
              <div className={styles.toolbarRight}>
                <button
                  type="button"
                  className={styles.quietButton}
                  aria-expanded={filterOpen}
                  aria-controls="uni-filter-panel"
                  onClick={() => setFilterOpen(!filterOpen)}
                >
                  <SlidersIcon size={14} />
                  필터{activeFilterCount > 0 ? ` ${activeFilterCount}` : ''}
                </button>
                <FilterSelect
                  id="uni-sort"
                  label="정렬"
                  value={sort}
                  options={sortOptions.map((option) => ({ value: option.value, label: option.label }))}
                  onChange={(value) => updateParams({ sort: value === 'recent' ? undefined : value })}
                />
              </div>
            </div>

            <div id="uni-filter-panel" className={styles.filterPanel} hidden={!filterOpen}>
              {filterOpen && (
                <>
                  <FilterSelect
                    id="uni-year"
                    label="학년도"
                    value={yearParam ? String(yearParam) : ''}
                    allLabel="전체 학년도"
                    options={years.map((year) => ({ value: String(year), label: `${year}학년도` }))}
                    onChange={(value) => updateParams({ year: value })}
                  />
                  <FilterSelect
                    id="uni-subject"
                    label="과목·영역"
                    value={subjectParam}
                    allLabel="전체 과목·영역"
                    options={subjects.map((subject) => ({ value: subject, label: subject }))}
                    onChange={(value) => updateParams({ subject: value })}
                  />
                  <FilterSelect
                    id="uni-type"
                    label="자료 유형"
                    value={typeParam ?? ''}
                    allLabel="전체 유형"
                    options={examCategoryOrder.map((category) => ({
                      value: category,
                      label: `${examCategoryLabels[category]} (${inUniversity.filter((document) => document.category === category).length})`,
                    }))}
                    onChange={(value) => updateParams({ type: value })}
                  />
                </>
              )}
            </div>

            {appliedFilters.length > 0 && (
              <div className={styles.appliedFilters} role="group" aria-label="적용된 조건">
                <span className={styles.rowMeta}>적용된 조건</span>
                {appliedFilters.map((filter) => (
                  <button
                    key={filter.key}
                    type="button"
                    className={styles.appliedChip}
                    aria-label={`${filter.label} 조건 지우기`}
                    onClick={() => updateParams({ [filter.key]: undefined })}
                  >
                    {filter.label}
                    <CloseIcon size={11} />
                  </button>
                ))}
                <button type="button" className={styles.linkButton} onClick={resetFilters}>
                  필터 초기화
                </button>
              </div>
            )}

            <p className={styles.resultLine}>
              <span>
                자료 <strong>{visible.length}</strong>개{query ? ` · '${query}' 검색` : ''}
              </span>
              <span className={styles.scopeNote}>
                <InfoIcon size={12} />
                검색은 문서 제목·대학·과목·원문 핵심 개념·문항 이름에서 찾아요 (PDF 본문 전체 검색은 아직 없어요)
              </span>
            </p>

            {inUniversity.length === 0 ? (
              <div className={enrichmentStyles.stateArea}>
                <EmptyState title="이 대학의 자료가 아직 없어요" description="다른 대학을 선택하거나 전체 자료를 둘러보세요." />
              </div>
            ) : visible.length === 0 ? (
              <div className={enrichmentStyles.stateArea}>
                <EmptyState
                  title="조건에 맞는 자료가 없어요"
                  description="검색어나 학년도·과목·유형을 바꿔 보세요."
                  action={
                    <button type="button" className={styles.quietButton} onClick={resetAll}>
                      검색·필터 초기화
                    </button>
                  }
                />
              </div>
            ) : (
              <div className={styles.examTable}>
                <div className={styles.examHead} aria-hidden="true">
                  <span>자료명</span>
                  <span>대학·학년도</span>
                  <span>과목·영역</span>
                  <span>분량</span>
                  <span>작업</span>
                </div>
                <ul className={styles.examList} aria-label="대학별 PDF 자료">
                  {visible.map((document) => (
                    <UniversityExamRow
                      key={document.documentId}
                      document={document}
                      fileState={fileStates.data?.[document.documentId] ?? 'UNKNOWN'}
                      listSearch={location.search}
                      onStartTask={(target) => setCreateRequest(examTaskPrefill(target, null, null, selectedContext?.subjects ?? []))}
                    />
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        <p className={styles.notice}>
          <InfoIcon size={13} />
          <span>
            원문 PDF는 저장소에 있는 파일을 개발 환경에서만 열어요. 공개 배포 전에는 각 대학의 이용 허락을 확인해야 해요. 서울대학교 자료에는
            상업적 이용과 문서의 변형·발췌를 금지하는 안내가 있어요. 앱의 탐구 방향 예시는 LearnersHigh가 쓴 학습용 제안이며 대학 공식 자료가 아니에요.
          </span>
        </p>
        <div className={enrichmentStyles.notices}>
          <MockDataNotice />
        </div>
      </div>
    </EnrichmentFrame>
  )
}

interface FilterSelectProps {
  id: string
  label: string
  value: string
  /** 있으면 "전체" 선택지 (값 '') */
  allLabel?: string
  options: { value: string; label: string }[]
  onChange: (value: string | undefined) => void
}

function FilterSelect({ id, label, value, allLabel, options, onChange }: FilterSelectProps) {
  return (
    <span className={styles.selectWrap}>
      <label className="lh-visually-hidden" htmlFor={id}>
        {label}
      </label>
      <select id={id} className={styles.select} value={value} onChange={(event) => onChange(event.target.value || undefined)}>
        {allLabel && <option value="">{allLabel}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon size={14} className={styles.selectChevron} />
    </span>
  )
}
