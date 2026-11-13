import { useSearchParams } from 'react-router'
import { listMockExamMaterials } from '../api/enrichmentApi.ts'
import { ChevronDownIcon, InfoIcon } from '../components/AssessmentIcons.tsx'
import { EnrichmentFrame } from '../components/enrichment/EnrichmentFrame.tsx'
import { MockExamResearchCard } from '../components/enrichment/MockExamResearchCard.tsx'
import mockStyles from '../components/enrichment/mockExam.module.css'
import styles from '../components/enrichment/enrichment.module.css'
import { EmptyState, ErrorState, LoadingRows } from '../components/StateViews.tsx'
import { mockExamPassageCount } from '../content/enrichmentContent.ts'
import { useApiQuery } from '../model/useApiQuery.ts'
import { applyFilters, filterOptions, mockExamPageStep, mockExamSubjectTabs, type MockExamFilters } from '../model/mockExamResearchView.ts'

const pageSize = 100

// 모의고사 지문 (screen-map S19, Mockup AE-MOCK-01, inquiry §4 ST-07, api-contract.md §17).
// 문제 풀이·채점 기능이 아니라 탐구 소재 탐색이다. 2026-10-28부터 공개 추천 소재는 "모의고사 지문 기반 심화 탐구 60선"
// (영어 30·국어 30, references/mock-exam 원본)이다. 카드에는 원문 대신 출처·소재·추천 주제·계열만 보이고, 원문은 상세에서 보여준다.
// 과목은 §17 Query(subjectId), 검색은 §17 query, 학년·시행 시기·계열은 §17에 없어 받은 목록에서 화면이 거른다 (MM-57).
// 탐색 상태(과목·검색·학년·시기·계열·더 보기 수)는 URL에 두어 상세에 다녀와도 그대로다.
// 원문 재배포 권한은 확인되지 않았다 (로컬 전용, P-24).
// 2026-11-11: 읽기 전용 정적 참고자료(content/enrichmentContent.ts). dataSource와 무관하다(http에서도 503 없음).
// "내 지문 등록"·내가 등록한 지문·스크린샷 영역·"심화 탐구 시작"을 없앴다(명세 §1).
export function MockExamMaterialsRoute() {
  const [searchParams, setSearchParams] = useSearchParams()
  const subjectId = searchParams.get('subject') ?? undefined
  const query = searchParams.get('q') ?? ''
  const filters: MockExamFilters = {
    grade: searchParams.get('grade') ?? undefined,
    period: searchParams.get('period') ?? undefined,
    major: searchParams.get('major') ?? undefined,
  }
  const shown = Math.max(mockExamPageStep, Number(searchParams.get('show')) || mockExamPageStep)

  const materials = useApiQuery(`ae-materials|${subjectId ?? ''}|${query}`, () =>
    listMockExamMaterials({ subjectId, query: query || undefined, page: 0, size: pageSize }),
  )
  // 과목 탭 건수: 검색 없이 전체를 받아 과목별로 센다 (숫자를 고정하지 않는다).
  const all = useApiQuery('ae-materials-all', () => listMockExamMaterials({ page: 0, size: pageSize }))

  const updateParams = (changes: Record<string, string | undefined>) =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        for (const [name, value] of Object.entries(changes)) {
          if (value) next.set(name, value)
          else next.delete(name)
        }
        // 조건이 바뀌면 처음 12개부터 다시 보여준다.
        if (!('show' in changes)) next.delete('show')
        return next
      },
      { replace: true, preventScrollReset: true },
    )

  const received = materials.data?.items ?? []
  const options = filterOptions(received)
  const items = applyFilters(received, filters)
  const visible = items.slice(0, shown)
  const hasFilter = Boolean(query || filters.grade || filters.period || filters.major)
  const passageCount = mockExamPassageCount()
  const countFor = (id: string | undefined) => (all.data ? all.data.items.filter((item) => !id || item.subjectId === id).length : undefined)

  return (
    <EnrichmentFrame searchPlaceholder="소재, 주제, 시험으로 지문 찾기">
      <header className={mockStyles.hero}>
        <div>
          <h2 className={mockStyles.heroTitle}>모의고사 지문 참고자료</h2>
          <p className={mockStyles.heroText}>실제 기출 지문의 소재를 교과 탐구로 넓혀 볼 수 있도록 영어·국어 지문에 탐구 주제와 방법을 붙여 두었어요.</p>
        </div>
      </header>

      <div className={mockStyles.subjectTabs} role="group" aria-label="과목">
        {mockExamSubjectTabs.map((tab) => (
          <button
            key={tab.label}
            type="button"
            className={mockStyles.subjectTab}
            aria-pressed={subjectId === tab.subjectId}
            onClick={() => updateParams({ subject: tab.subjectId })}
          >
            {tab.label}
            <span className={mockStyles.subjectCount}>{countFor(tab.subjectId) ?? '–'}</span>
          </button>
        ))}
      </div>

      <div className={mockStyles.filterRow}>
        <FilterSelect label="학년" value={filters.grade} placeholder="학년 전체" options={options.grades.map((o) => ({ value: o.key, label: `${o.label} (${o.count})` }))} onChange={(value) => updateParams({ grade: value })} />
        <FilterSelect label="시행 시기" value={filters.period} placeholder="시행 시기 전체" options={options.periods.map((o) => ({ value: o.key, label: `${o.label} (${o.count})` }))} onChange={(value) => updateParams({ period: value })} />
        <FilterSelect label="추천 계열·학과" value={filters.major} placeholder="계열·학과 전체" options={options.majors.map((o) => ({ value: o.key, label: `${o.key} (${o.count})` }))} onChange={(value) => updateParams({ major: value })} />
        {hasFilter && (
          <button type="button" className={mockStyles.resetButton} onClick={() => updateParams({ q: undefined, grade: undefined, period: undefined, major: undefined })}>
            필터 초기화
          </button>
        )}
      </div>

      <section aria-label="모의고사 탐구 소재 목록" aria-busy={materials.isRefreshing}>
        {materials.status === 'error' && materials.error ? (
          <div className={styles.stateArea}>
            <ErrorState title="탐구 소재를 불러오지 못했어요" error={materials.error} onRetry={materials.retry} />
          </div>
        ) : !materials.data ? (
          <div className={styles.stateArea}>
            <LoadingRows rows={3} label="탐구 소재를 불러오는 중" />
          </div>
        ) : items.length === 0 ? (
          <div className={styles.stateArea}>
            <EmptyState
              title={hasFilter || subjectId ? '조건에 맞는 탐구 소재가 없어요' : '아직 공개된 탐구 소재가 없어요'}
              description={hasFilter ? '검색어나 필터를 바꾸거나 초기화해 보세요.' : undefined}
            />
          </div>
        ) : (
          <>
            <p className={mockStyles.resultCount} role="status">
              {items.length}개 소재{items.length > visible.length ? ` 중 ${visible.length}개 표시` : ''}
            </p>
            <ul className={mockStyles.cardGrid}>
              {visible.map((item) => (
                <li key={item.materialId}>
                  <MockExamResearchCard item={item} />
                </li>
              ))}
            </ul>
            {items.length > visible.length && (
              <button type="button" className={mockStyles.moreButton} onClick={() => updateParams({ show: String(shown + mockExamPageStep) })}>
                더 보기 ({visible.length}/{items.length})
              </button>
            )}
          </>
        )}
        <p className={mockStyles.rightsNote}>
          <InfoIcon size={13} />
          지문은 시험 자료에서 발췌한 원문이고, 추천 계열·주제·해설·방법·질문은 LearnersHigh가 만든 학습용 제안이에요 (출제기관 공식 해설 아님). 원문 공개 배포 권한은 아직 확인 전이에요.
          {passageCount === 0 ? ' 이 환경에는 원문 지문이 포함되지 않았어요 (원문 미포함).' : ''}
        </p>
      </section>

    </EnrichmentFrame>
  )
}

function FilterSelect({ label, value, placeholder, options, onChange }: { label: string; value: string | undefined; placeholder: string; options: { value: string; label: string }[]; onChange: (value: string | undefined) => void }) {
  return (
    <span className={mockStyles.filterSelect}>
      <select aria-label={label} value={value ?? ''} onChange={(event) => onChange(event.target.value || undefined)}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon size={14} className={mockStyles.selectChevron} />
    </span>
  )
}
